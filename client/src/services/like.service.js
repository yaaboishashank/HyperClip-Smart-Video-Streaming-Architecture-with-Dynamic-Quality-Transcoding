import { api, id, query } from "./api";
export const likeService = {
  toggle: (type, targetId) =>
    api("/likes/toggle/" + type + "/" + id(targetId), { method: "POST" }),
  videos: (params, signal) => api("/likes/videos" + query(params), { signal }),
};
