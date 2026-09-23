import { Routes, Route } from "react-router-dom";
import AppLayout from "../components/layout/AppLayout";
import ProtectedRoute from "./ProtectedRoute";
import Login from "../pages/Login";
import Register from "../pages/Register";
import Home from "../pages/Home";
import Watch from "../pages/Watch";
import Upload from "../pages/Upload";
import Channel from "../pages/Channel";
import Library from "../pages/Library";
import Playlist from "../pages/Playlist";
import History from "../pages/History";
import LikedVideos from "../pages/LikedVideos";
import Subscriptions from "../pages/Subscriptions";
import Studio from "../pages/Studio";
import Settings from "../pages/Settings";
import NotFound from "../pages/NotFound";
export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route index element={<Home />} />
          <Route path="watch/:videoId" element={<Watch />} />
          <Route path="upload" element={<Upload />} />
          <Route path="channel/:username" element={<Channel />} />
          <Route path="library" element={<Library />} />
          <Route path="playlist/:playlistId" element={<Playlist />} />
          <Route path="history" element={<History />} />
          <Route path="liked" element={<LikedVideos />} />
          <Route path="subscriptions" element={<Subscriptions />} />
          <Route path="studio" element={<Studio />} />
          <Route path="settings" element={<Settings />} />
        </Route>
      </Route>
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
