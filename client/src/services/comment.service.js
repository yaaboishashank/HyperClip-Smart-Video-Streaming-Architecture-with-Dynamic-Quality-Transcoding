import { api, id, query } from "./api";
export const commentService = {
  list: (videoId, params, signal) =>
    api("/comments/" + id(videoId) + query(params), { signal }),
  add: (videoId, content) =>
    api("/comments/" + id(videoId), { method: "POST", body: { content } }),
  update: (commentId, content) =>
    api("/comments/c/" + id(commentId), { method: "PATCH", body: { content } }),
  remove: (commentId) =>
    api("/comments/c/" + id(commentId), { method: "DELETE" }),
};
