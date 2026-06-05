import FullHistoricalMap from "@/components/FullHistoricalMap";

export const metadata = {
  title: "Historical Map - InsightGraph",
  description: "Interactive historical map viewer",
}

export default function MapPage() {
  return (
    <div className="w-full h-full bg-[#171717]">
      <FullHistoricalMap />
    </div>
  )
}
