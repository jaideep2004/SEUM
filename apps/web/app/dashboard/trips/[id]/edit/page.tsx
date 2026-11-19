"use client";

import { useParams } from "next/navigation";
import TripForm from "../../_components/TripForm";

export default function EditTripPage() {
  const { id } = useParams<{ id: string }>();
  return <TripForm mode="edit" tripId={id} />;
}
