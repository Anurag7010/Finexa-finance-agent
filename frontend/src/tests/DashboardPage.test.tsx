import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import DashboardPage from '../pages/DashboardPage';
import * as api from '../lib/api';
import { useStore } from '../store/useStore';
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../lib/api', () => ({
  getInsights: vi.fn(),
  getGoals: vi.fn(),
  getSubscriptionTotals: vi.fn(),
  getDataSources: vi.fn(),
  updateProfile: vi.fn(),
}));

vi.mock('../store/useStore', () => ({
  useStore: vi.fn(),
}));

const renderWithRouter = (ui: React.ReactElement) => {
  return render(<BrowserRouter>{ui}</BrowserRouter>);
};

describe('DashboardPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading state initially', () => {
    (useStore as any).mockReturnValue({
      user: { id: '1', income: 50000, monthly_budget: 20000 },
      insight: null,
      setInsight: vi.fn(),
      setUser: vi.fn(),
    });
    (api.getInsights as any).mockReturnValue(new Promise(() => {}));
    (api.getGoals as any).mockReturnValue(new Promise(() => {}));
    (api.getSubscriptionTotals as any).mockReturnValue(new Promise(() => {}));
    (api.getDataSources as any).mockReturnValue(new Promise(() => {}));
    
    const { container } = renderWithRouter(<DashboardPage />);
    expect(container.querySelector('.animate-pulse')).toBeInTheDocument();
  });

  it('renders dashboard content after data loads', async () => {
    (useStore as any).mockReturnValue({
      user: { id: '1', income: 50000, monthly_budget: 20000, category_budgets: {} },
      insight: {
        health_score: 85,
        risk_level: 'low',
        monthly_spend: 15000,
        monthly_budget: 30000,
        top_category: 'Food',
        savings_rate: 0.5,
        risk_factors: [],
        recommendations: [],
        category_summary: {},
        category_breaches: [],
        forecast: [],
      },
      setInsight: vi.fn(),
      setUser: vi.fn(),
    });

    (api.getInsights as any).mockResolvedValue({
      insight: {
        health_score: 85,
      }
    });
    (api.getGoals as any).mockResolvedValue({ goals: [] });
    (api.getSubscriptionTotals as any).mockResolvedValue({ count: 0, monthly: 0, annual: 0 });
    (api.getDataSources as any).mockResolvedValue({ sources: [] });

    renderWithRouter(<DashboardPage />);

    await waitFor(() => {
      // The word "Profile Finance Inputs" is rendered when dashboard successfully loads
      expect(screen.getByText(/profile finance inputs/i)).toBeInTheDocument();
    });
    
    // Health score rendered
    expect(screen.getByText('85')).toBeInTheDocument();
  });
});
