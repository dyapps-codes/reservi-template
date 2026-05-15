import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'

const NotFound = () => {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4 text-center p-8">
      <h1 className="text-6xl font-bold text-foreground">404</h1>
      <p className="text-muted-foreground text-lg">This page doesn't exist.</p>
      <Button onClick={() => navigate('/')}>Go home</Button>
    </div>
  )
}

export default NotFound
