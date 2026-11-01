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

  // announcementId -> requestId
  pendingRequests: Record<number, string>;

  // Active request ID for mark-all operation
  markAllRequestId: string | null;

  fetchRequestId: string | null;
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
  pendingRequests: {},
  markAllRequestId: null,
  fetchRequestId: null,
  actionError: null,
};

const LOAD_ERROR = "We couldn't load announcements. Please try again.";
const UPDATE_ERROR =
  "We couldn't update an announcement's read status. Please try again.";
const MARK_ALL_ERROR =
  "We couldn't mark all announcements as read. Please try again.";

export const fetchAnnouncements = createAsyncThunk<
  Announcement[],
  void,
  { state: ThunkState; rejectValue: string }
>(
  "announcements/fetchAnnouncements",
  async (_, { rejectWithValue, signal }) => {
    try {
      return await getCustomerAnnouncements(signal);
    } catch {
      if (signal.aborted) throw new Error("Request aborted");
      return rejectWithValue(LOAD_ERROR);
    }
  },
  {
    condition: (_, { getState }) => {
      return !getState().announcements.loading;
    },
  }
);

export const toggleAnnouncementRead = createAsyncThunk<
  { announcementId: number; isRead: boolean },
  number,
  { state: ThunkState; rejectValue: string }
>(
  "announcements/toggleAnnouncementRead",
  async (announcementId, { getState, rejectWithValue, signal }) => {
    const announcement = getState().announcements.announcements.find(
      (item) => item.announcementId === announcementId
    );

    if (!announcement) {
      return rejectWithValue("Announcement not found.");
    }

    const nextIsRead = !announcement.isRead;

    try {
      if (nextIsRead) {
        await markAnnouncementAsRead(announcementId, signal);
      } else {
        await markAnnouncementAsUnread(announcementId, signal);
      }

      return { announcementId, isRead: nextIsRead };
    } catch {
      if (signal.aborted) throw new Error("Request aborted");
      return rejectWithValue(UPDATE_ERROR);
    }
  },
  {
    condition: (announcementId, { getState }) => {
      const state = getState().announcements;

      return (
        !state.loading &&
        !state.markAllRequestId &&
        !state.pendingRequests[announcementId] &&
        state.announcements.some(
          (item) => item.announcementId === announcementId
        )
      );
    },
  }
);

export const markAllAnnouncementsRead = createAsyncThunk<
  void,
  void,
  { state: ThunkState; rejectValue: string }
>(
  "announcements/markAllAnnouncementsRead",
  async (_, { rejectWithValue, signal }) => {
    try {
      await markAllAnnouncementsAsRead(signal);
    } catch {
      if (signal.aborted) throw new Error("Request aborted");
      return rejectWithValue(MARK_ALL_ERROR);
    }
  },
  {
    condition: (_, { getState }) => {
      const state = getState().announcements;

      return (
        !state.loading &&
        !state.markAllRequestId &&
        Object.keys(state.pendingRequests).length === 0 &&
        state.announcements.some((item) => !item.isRead)
      );
    },
  }
);

const announcementSlice = createSlice({
  name: "announcements",
  initialState,
  reducers: {
    clearAnnouncementErrors: (state) => {
      state.error = null;
      state.actionError = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch announcements
      .addCase(fetchAnnouncements.pending, (state, action) => {
        state.loading = true;
        state.error = null;
        state.fetchRequestId = action.meta.requestId;
      })
      .addCase(fetchAnnouncements.fulfilled, (state, action) => {
        if (state.fetchRequestId !== action.meta.requestId) return;

        state.loading = false;
        state.hasLoaded = true;
        state.announcements = action.payload;
        state.error = null;
        state.fetchRequestId = null;
      })
      .addCase(fetchAnnouncements.rejected, (state, action) => {
        if (state.fetchRequestId !== action.meta.requestId) return;

        state.loading = false;
        state.fetchRequestId = null;

        if (action.meta.aborted) return;

        state.hasLoaded = true;
        state.error = action.payload ?? LOAD_ERROR;
      })

      // Toggle one announcement
      .addCase(toggleAnnouncementRead.pending, (state, action) => {
        state.actionError = null;
        state.pendingRequests[action.meta.arg] = action.meta.requestId;
      })
      .addCase(toggleAnnouncementRead.fulfilled, (state, action) => {
        const { announcementId, isRead } = action.payload;

        if (
          state.pendingRequests[announcementId] !== action.meta.requestId
        ) {
          return;
        }

        const announcement = state.announcements.find(
          (item) => item.announcementId === announcementId
        );

        if (announcement) {
          announcement.isRead = isRead;
        }

        delete state.pendingRequests[announcementId];
      })
      .addCase(toggleAnnouncementRead.rejected, (state, action) => {
        const announcementId = action.meta.arg;

        if (
          state.pendingRequests[announcementId] !== action.meta.requestId
        ) {
          return;
        }

        delete state.pendingRequests[announcementId];

        if (action.meta.aborted) return;

        state.actionError = action.payload ?? UPDATE_ERROR;
      })

      // Mark all announcements as read
      .addCase(markAllAnnouncementsRead.pending, (state, action) => {
        state.actionError = null;
        state.markAllRequestId = action.meta.requestId;
      })
      .addCase(markAllAnnouncementsRead.fulfilled, (state, action) => {
        if (state.markAllRequestId !== action.meta.requestId) return;

        state.announcements.forEach((announcement) => {
          announcement.isRead = true;
        });

        state.markAllRequestId = null;
      })
      .addCase(markAllAnnouncementsRead.rejected, (state, action) => {
        if (state.markAllRequestId !== action.meta.requestId) return;

        state.markAllRequestId = null;

        if (action.meta.aborted) return;

        state.actionError = action.payload ?? MARK_ALL_ERROR;
      });
  },
});

export const { clearAnnouncementErrors } = announcementSlice.actions;

export default announcementSlice.reducer;