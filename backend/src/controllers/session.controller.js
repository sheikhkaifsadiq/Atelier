import {
  createSession,
  listSessions,
  getSession,
  renameSession,
  deleteSession,
  listMessages,
} from "../services/session.service.js";

export const list = async (req, res, next) => {
  try {
    const sessions = await listSessions(req.user.userId);
    res.json({ sessions });
  } catch (err) { next(err); }
};

export const create = async (req, res, next) => {
  try {
    const session = await createSession(req.user.userId, req.body?.title);
    res.status(201).json({ session });
  } catch (err) { next(err); }
};

export const messages = async (req, res, next) => {
  try {
    const session = await getSession(req.params.id, req.user.userId);
    if (!session) return res.status(404).json({ message: "Not found" });
    const msgs = await listMessages(session.id);
    res.json({ session, messages: msgs });
  } catch (err) { next(err); }
};

export const rename = async (req, res, next) => {
  try {
    const title = String(req.body?.title || "").trim().slice(0, 120);
    if (!title) return res.status(400).json({ message: "Title required" });
    const updated = await renameSession(req.params.id, req.user.userId, title);
    if (!updated) return res.status(404).json({ message: "Not found" });
    res.json({ session: updated });
  } catch (err) { next(err); }
};

export const remove = async (req, res, next) => {
  try {
    const ok = await deleteSession(req.params.id, req.user.userId);
    if (!ok) return res.status(404).json({ message: "Not found" });
    res.json({ ok: true });
  } catch (err) { next(err); }
};
