
import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";

import {
  getCustomerAnnouncements,
  markAllAnnouncementsAsRead,
  markAnnouncementAsRead,
  markAnnouncementAsUnread,
} from "../api/announcementApi";

import type { Announcement } from "../types/announcementTypes";

interface AnnouncementState {
  announcements: Announcement[];
  loading: boolean;
  hasLoaded: boolean;
  error: string | null;
  pendingIds: number[];
  isMarkingAllRead: boolean;
  actionError: string | null;
}

interface ThunkState {
  announcements: AnnouncementState;
}

const initialState: AnnouncementState = {
  announcements: [],
  loading: false,
  hasLoaded: false,
  error: null,
  pendingIds: [],
  isMarkingAllRead: false,
  actionError: null,
};

const LOAD_ERROR =
  "We couldn't load announcements. Please try again.";

const UPDATE_ERROR =
  "We couldn't update an announcement's read status. Please try again.";

const MARK_ALL_ERROR =
  "We couldn't mark all announcements as read. Please try again.";

export const fetchAnnouncements = createAsyncThunk<
  Announcement[],
  void,
  {
    state: ThunkState;
    rejectValue: string;
  }
>(
  "announcements/fetchAnnouncements",
  async (_, { rejectWithValue }) => {
    try {
      return await getCustomerAnnouncements();
    } catch {
      return rejectWithValue(LOAD_ERROR);
    }
  },
  {
    condition: (_, { getState }) => {
      return !getState().announcements.loading;
    },
  },
);

export const toggleAnnouncementRead = createAsyncThunk<
  { announcementId: number; isRead: boolean },
  number,
  {
    state: ThunkState;
    rejectValue: string;
  }
>(
  "announcements/toggleAnnouncementRead",
  async (announcementId, { getState, rejectWithValue }) => {
    const announcement = getState().announcements.announcements.find(
      (item) => item.announcementId === announcementId,
    );

    if (!announcement) {
      return rejectWithValue("Announcement not found.");
    }

    const nextIsRead = !announcement.isRead;

    try {
      if (nextIsRead) {
        await markAnnouncementAsRead(announcementId);
      } else {
        await markAnnouncementAsUnread(announcementId);
      }

      return {
        announcementId,
        isRead: nextIsRead,
      };
    } catch {
      return rejectWithValue(UPDATE_ERROR);
    }
  },
  {
    condition: (announcementId, { getState }) => {
      const state = getState().announcements;

      return (
        !state.loading &&
        !state.isMarkingAllRead &&
        !state.pendingIds.includes(announcementId) &&
        state.announcements.some(
          (item) => item.announcementId === announcementId,
        )
      );
    },
  },
);

export const markAllAnnouncementsRead = createAsyncThunk<
  void,
  void,
  {
    state: ThunkState;
    rejectValue: string;
  }
>(
  "announcements/markAllAnnouncementsRead",
  async (_, { rejectWithValue }) => {
    try {
      await markAllAnnouncementsAsRead();
    } catch {
      return rejectWithValue(MARK_ALL_ERROR);
    }
  },
  {
    condition: (_, { getState }) => {
      const state = getState().announcements;

      return (
        !state.loading &&
        !state.isMarkingAllRead &&
        state.pendingIds.length === 0 &&
        state.announcements.some((item) => !item.isRead)
      );
    },
  },
);

const announcementSlice = createSlice({
  name: "announcements",
  initialState,
  reducers: {
    clearAnnouncementErrors(state) {
      state.error = null;
      state.actionError = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Load announcements
      .addCase(fetchAnnouncements.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAnnouncements.fulfilled, (state, action) => {
        state.loading = false;
        state.hasLoaded = true;
        state.announcements = action.payload;
        state.error = null;
      })
      .addCase(fetchAnnouncements.rejected, (state, action) => {
        state.loading = false;
        state.hasLoaded = true;
        state.error = action.payload ?? LOAD_ERROR;
      })

      // Toggle one announcement's read status
      .addCase(toggleAnnouncementRead.pending, (state, action) => {
        state.actionError = null;
        state.pendingIds.push(action.meta.arg);
      })
      .addCase(toggleAnnouncementRead.fulfilled, (state, action) => {
        const { announcementId, isRead } = action.payload;

        state.announcements = state.announcements.map((item) =>
          item.announcementId === announcementId
            ? { ...item, isRead }
            : item,
        );

        state.pendingIds = state.pendingIds.filter(
          (id) => id !== announcementId,
        );
      })
      .addCase(toggleAnnouncementRead.rejected, (state, action) => {
        state.pendingIds = state.pendingIds.filter(
          (id) => id !== action.meta.arg,
        );

        if (!action.meta.aborted && action.payload) {
          state.actionError = action.payload;
        }
      })

      // Mark all announcements as read
      .addCase(markAllAnnouncementsRead.pending, (state) => {
        state.actionError = null;
        state.isMarkingAllRead = true;
      })
      .addCase(markAllAnnouncementsRead.fulfilled, (state) => {
        state.isMarkingAllRead = false;

        state.announcements = state.announcements.map((item) => ({
          ...item,
          isRead: true,
        }));
      })
      .addCase(markAllAnnouncementsRead.rejected, (state, action) => {
        state.isMarkingAllRead = false;

        if (!action.meta.aborted && action.payload) {
          state.actionError = action.payload;
        }
      });
  },
});

export const { clearAnnouncementErrors } = announcementSlice.actions;

export default announcementSlice.reducer;
