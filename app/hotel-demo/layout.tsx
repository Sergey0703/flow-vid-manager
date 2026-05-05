import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "AI Hotel Receptionist Demo — Live Booking Calendar | AIMediaFlow",
  description: "Watch our AI phone receptionist take real hotel bookings live. Call the AI agent and see your reservation appear instantly on the booking calendar. AIMediaFlow, Kerry, Ireland.",
  keywords: "AI hotel receptionist Ireland, AI booking system Kerry, hotel chatbot demo, AI phone agent hospitality Ireland",
  robots: "index, follow",
  alternates: {
    canonical: "https://aimediaflow.net/hotel-demo",
  },
  openGraph: {
    title: "AI Hotel Receptionist Demo — Live Booking Calendar",
    description: "Call our AI receptionist and watch your booking appear in real time. Live demo by AIMediaFlow.",
    url: "https://aimediaflow.net/hotel-demo",
    siteName: "AIMediaFlow",
    type: "website",
  },
};

export default function HotelDemoLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
