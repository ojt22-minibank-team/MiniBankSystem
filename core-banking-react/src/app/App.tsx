// src/app/App.tsx တွင် ပြင်ဆင်ရမည့်ပုံစံ
import './App.css'
// မိမိတည်ဆောက်ထားသော RouterProvider ကို Import လုပ်ပါ
import { RouterProvider } from './router/RouterProvider';

// (မှတ်ချက် - Redux သုံးရန်လိုအပ်ပါက src/app/providers/ReduxProvider.tsx ကိုပါ ဤနေရာတွင် Import လုပ်ပြီး ပတ်ပေးရပါမည်)

function App() {
  return (
    // Router များကို အလုပ်လုပ်စေရန် App ထဲတွင် ထည့်ပေးခြင်းဖြစ်သည်
    <RouterProvider />
  )
}

export default App