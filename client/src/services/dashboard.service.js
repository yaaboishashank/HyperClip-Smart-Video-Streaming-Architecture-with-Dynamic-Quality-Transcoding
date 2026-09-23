import { api, query } from "./api";
export const dashboardService = {
  stats: (signal) => api("/dashboard/stats", { signal }),
  videos: (params, signal) =>
    api("/dashboard/videos" + query(params), { signal }),
};
