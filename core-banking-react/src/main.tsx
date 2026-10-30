import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './app/App.tsx'

// Redux store နှင့် axios မှ injectStore ကို Import လုပ်ပါ
import { store } from './lib/redux' 
import { injectStore } from './lib/axios' 

// App မစတင်မီ Store ကို Axios ထဲသို့ ထည့်သွင်းပါ
injectStore(store)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)