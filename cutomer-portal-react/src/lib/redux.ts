import { configureStore } from "@reduxjs/toolkit";
import {
  useDispatch,
  useSelector,
} from "react-redux";

import profileReducer from "../features/customer-account/profile/ProfileSlice";
import transferReducer from '../features/transfer/store/transferSlice';
import accountsReducer from '../features/customer-account/accounts/accountsSlice';


export const store = configureStore({
  reducer: {
    profile: profileReducer,
    transfer: transferReducer,
    accounts: accountsReducer,
  },
});

export type RootState =
  ReturnType<typeof store.getState>;

export type AppDispatch =
  typeof store.dispatch;

export const useAppDispatch =
  useDispatch.withTypes<AppDispatch>();

export const useAppSelector =
  useSelector.withTypes<RootState>();

  

