
import api from "./api";

export const addWebsite = async (websiteData) =>
  (await api.post("/websites/", websiteData)).data;

export const getWebsites = async () =>
  (await api.get("/websites/")).data;

export const deleteWebsite = async (websiteId) =>
  (await api.delete(`/websites/${websiteId}`)).data;