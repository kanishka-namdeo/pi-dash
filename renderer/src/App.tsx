import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

function App() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-8">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl">Pi Dashboard</CardTitle>
          <CardDescription>
            Built with React 19, Vite, and shadcn/ui
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="mb-4 text-sm text-muted-foreground">
            Ready to build something amazing.
          </p>
          <Button onClick={() => console.log('Clicked!')}>
            Get Started
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

export default App
