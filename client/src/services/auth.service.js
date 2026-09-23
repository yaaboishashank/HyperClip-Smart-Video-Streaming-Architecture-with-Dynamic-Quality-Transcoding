import { api, id } from "./api";
export const authService = {
  me: () => api("/users/current-user"),
  login: (body) =>
    api("/users/login", { method: "POST", body, refresh: false }),
  register: (body) =>
    api("/users/register", { method: "POST", body, refresh: false }),
  logout: () => api("/users/logout", { method: "POST" }),
  update: (body) => api("/users/update-account", { method: "PATCH", body }),
  password: (body) => api("/users/change-password", { method: "POST", body }),
  image: (field, file) => {
    const body = new FormData();
    body.append(field, file);
    return api("/users/" + (field === "avatar" ? "avatar" : "cover-image"), {
      method: "PATCH",
      body,
    });
  },
  channel: (username, signal) => api("/users/c/" + id(username), { signal }),
  history: (signal) => api("/users/history", { signal }),
  recordView: (videoId) =>
    api("/users/history/" + id(videoId), { method: "POST" }),
};
