
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Home from '@/pages/home';
import Chat from '@/pages/chat';
import Navigation from '@/components/navigation';

function App() {
  return (
    <BrowserRouter>

      <main className="w-screen h-screen overflow-hidden">
        <Navigation />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/chat">
            <Route path="" element={<Chat />}></Route>
            <Route path=":id" element={<Chat />}></Route>
          </Route>
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </main>
    </BrowserRouter>
  );
}

export default App
