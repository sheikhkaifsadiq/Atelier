import api from "./api";

export const fetchMe = async () => (await api.get("/users/me")).data.user;
export const fetchCredits = async () => (await api.get("/users/me/credits")).data;
