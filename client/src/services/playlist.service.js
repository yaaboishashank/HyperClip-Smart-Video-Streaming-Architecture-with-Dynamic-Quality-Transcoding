import { api, id, query } from "./api";
export const playlistService = {
  list: (userId, params, signal) =>
    api("/playlist/user/" + id(userId) + query(params), { signal }),
  get: (playlistId, signal) => api("/playlist/" + id(playlistId), { signal }),
  create: (body) => api("/playlist", { method: "POST", body }),
  update: (playlistId, body) =>
    api("/playlist/" + id(playlistId), { method: "PATCH", body }),
  remove: (playlistId) =>
    api("/playlist/" + id(playlistId), { method: "DELETE" }),
  addVideo: (playlistId, videoId) =>
    api("/playlist/add/" + id(videoId) + "/" + id(playlistId), {
      method: "PATCH",
    }),
  removeVideo: (playlistId, videoId) =>
    api("/playlist/remove/" + id(videoId) + "/" + id(playlistId), {
      method: "PATCH",
    }),
};
