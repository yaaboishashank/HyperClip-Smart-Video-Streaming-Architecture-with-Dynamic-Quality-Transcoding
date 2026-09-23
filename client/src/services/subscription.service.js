import { api, id, query } from "./api";
export const subscriptionService = {
  toggle: (channelId) =>
    api("/subscriptions/c/" + id(channelId), { method: "POST" }),
  subscribers: (channelId, params, signal) =>
    api("/subscriptions/c/" + id(channelId) + query(params), { signal }),
  channels: (userId, params, signal) =>
    api("/subscriptions/u/" + id(userId) + query(params), { signal }),
};
