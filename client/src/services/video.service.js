import { api, id, query } from "./api";

export const videoService = {
  list: (params, signal) =>
    api("/videos" + query(params), { signal }),

  get: (videoId, signal) =>
    api("/videos/" + id(videoId), { signal }),

  upload: (body) =>
    api("/videos", {
      method: "POST",
      body,
    }),

  update: (videoId, body) =>
    api("/videos/" + id(videoId), {
      method: "PATCH",
      body,
    }),

  remove: (videoId) =>
    api("/videos/" + id(videoId), {
      method: "DELETE",
    }),

  togglePublish: (videoId) =>
    api("/videos/toggle/publish/" + id(videoId), {
      method: "PATCH",
    }),

  status: (videoId, signal) =>
    api("/videos/" + id(videoId) + "/status", {
      signal,
    }),

  retry: (videoId) =>
    api("/videos/" + id(videoId) + "/retry", {
      method: "POST",
    }),
};