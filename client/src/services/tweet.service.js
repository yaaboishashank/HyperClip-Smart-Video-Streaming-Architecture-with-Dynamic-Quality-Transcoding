import { api, id, query } from "./api";
export const tweetService = {
  list: (userId, params, signal) =>
    api("/tweets/user/" + id(userId) + query(params), { signal }),
  create: (content) => api("/tweets", { method: "POST", body: { content } }),
  update: (tweetId, content) =>
    api("/tweets/" + id(tweetId), { method: "PATCH", body: { content } }),
  remove: (tweetId) => api("/tweets/" + id(tweetId), { method: "DELETE" }),
};
