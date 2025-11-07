import { Routes, Route, Navigate } from 'react-router-dom'
import { Layout } from 'antd'
import AppLayout from './components/Layout/AppLayout'
import MarketOverview from './pages/MarketOverview'
import Landing from './pages/Landing'
import BuildingAnalysis from './pages/BuildingAnalysis'
import RecipeAnalysis from './pages/RecipeAnalysis'
import ComprehensiveAnalysis from './pages/ComprehensiveAnalysis'
import SystemPlanning from './pages/SystemPlanning'

const { Content } = Layout

function App() {
  return (
    <Routes>
      {/* 独立着陆页，不使用 AppLayout */}
      <Route path="/portal" element={<Landing />} />
      <Route path="/" element={<Navigate to="/portal" replace />} />

      {/* 业务页面使用 AppLayout 包裹 */}
      <Route
        path="/market"
        element={
          <AppLayout>
            <Content>
              <MarketOverview />
            </Content>
          </AppLayout>
        }
      />
      <Route
        path="/buildings"
        element={
          <AppLayout>
            <Content>
              <BuildingAnalysis />
            </Content>
          </AppLayout>
        }
      />
      <Route
        path="/recipes"
        element={
          <AppLayout>
            <Content>
              <RecipeAnalysis />
            </Content>
          </AppLayout>
        }
      />
      <Route
        path="/comprehensive"
        element={
          <AppLayout>
            <Content>
              <ComprehensiveAnalysis />
            </Content>
          </AppLayout>
        }
      />
      <Route
        path="/systems"
        element={
          <AppLayout>
            <Content>
              <SystemPlanning />
            </Content>
          </AppLayout>
        }
      />
    </Routes>
  )
}

export default App

