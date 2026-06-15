import { useEffect, useState } from "react";
import { on402 } from "../services/api";
import CreditsModal from "./modals/CreditsModal";

export default function CreditGuard() {
  const [info, setInfo] = useState(null);
  useEffect(() => on402((data) => setInfo(data)), []);
  return <CreditsModal open={!!info} info={info} onClose={() => setInfo(null)} />;
}
