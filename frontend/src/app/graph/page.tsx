export default function GraphPage() {
  return (
    <div className="h-[calc(100vh-10rem)] border rounded-lg bg-card relative overflow-hidden">
      <div className="absolute inset-0 flex items-center justify-center bg-muted/10">
        <div className="text-center space-y-2">
          <p className="text-lg font-medium">Knowledge Graph</p>
          <p className="text-sm text-muted-foreground">Visualizing entities and relations...</p>
        </div>
      </div>
      
      <div className="absolute top-4 left-4 z-10 p-4 bg-background/80 backdrop-blur border rounded-md shadow-sm">
        <h3 className="font-semibold text-sm">Graph Controls</h3>
        <p className="text-xs text-muted-foreground mt-1">Interactive graph visualization will render here.</p>
      </div>
    </div>
  )
}
