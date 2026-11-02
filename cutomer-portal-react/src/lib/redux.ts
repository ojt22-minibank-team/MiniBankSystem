
import {
  combineReducers,
  configureStore,
  createAction,
} from "@reduxjs/toolkit";

import {
  useDispatch,
  useSelector,
} from "react-redux";

import profileReducer from "../features/customer-account/profile/store/ProfileSlice";
import settingsReducer from "../features/customer-account/settings/store/SettingsSlice";
import transferReducer from "../features/transfer/store/transferSlice";
import accountsReducer from "../features/customer-account/accounts/stores/accountsSlice";
import announcementReducer from "../features/customer-account/announcements/store/announcementSlice";
import dashboardReducer from "../features/customer-account/dashboard/store/dashboardSlice";

// Session reset action
export const resetCustomerState = createAction(
  "customer/resetState"
);

// Feature reducers
const appReducer = combineReducers({
  profile: profileReducer,
  settings: settingsReducer,
  transfer: transferReducer,
  accounts: accountsReducer,
  announcements: announcementReducer,
  dashboard: dashboardReducer,
});

// Root reducer
const rootReducer = (
  state: ReturnType<typeof appReducer> | undefined,
  action: Parameters<typeof appReducer>[1],
) => {
  if (resetCustomerState.match(action)) {
    const resetState = appReducer(undefined, action);

    return {
      ...resetState,
      settings: state?.settings ?? resetState.settings,
    };
  }

  return appReducer(state, action);
};

// Store
export const store = configureStore({
  reducer: rootReducer,
});

export type RootState = ReturnType<typeof store.getState>;

export type AppDispatch = typeof store.dispatch;

export const useAppDispatch =
  useDispatch.withTypes<AppDispatch>();

export const useAppSelector =
  useSelector.withTypes<RootState>();
