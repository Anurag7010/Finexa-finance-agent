import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import LoginPage from '../pages/LoginPage';
import * as api from '../lib/api';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the API module
vi.mock('../lib/api', () => ({
  login: vi.fn(),
  refreshInsights: vi.fn(),
}));

const renderWithRouter = (ui: React.ReactElement) => {
  return render(<BrowserRouter>{ui}</BrowserRouter>);
};

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe('LoginPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders login form elements', () => {
    renderWithRouter(<LoginPage />);
    expect(screen.getByRole('heading', { name: /welcome back/i })).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/demo@finexa.ai/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/••••••••/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /log in/i })).toBeInTheDocument();
  });

  it('demo login button fills credentials', async () => {
    renderWithRouter(<LoginPage />);
    
    const demoButton = screen.getByRole('button', { name: /demo login/i });
    fireEvent.click(demoButton);
    
    expect(screen.getByPlaceholderText(/demo@finexa.ai/i)).toHaveValue('demo@smartspend.ai');
    expect(screen.getByPlaceholderText(/••••••••/i)).toHaveValue('demo1234');
  });

  it('shows error on failed login', async () => {
    (api.login as any).mockRejectedValueOnce(new Error('Network error'));
    renderWithRouter(<LoginPage />);
    
    const emailInput = screen.getByPlaceholderText(/demo@finexa.ai/i);
    const passInput = screen.getByPlaceholderText(/••••••••/i);
    const submitBtn = screen.getByRole('button', { name: /log in/i });

    await userEvent.type(emailInput, 'wrong@example.com');
    await userEvent.type(passInput, 'wrongpass');
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText(/login failed/i)).toBeInTheDocument();
    });
  });

  it('redirects to dashboard on success', async () => {
    (api.login as any).mockResolvedValueOnce({ token: 'test-token', user: { id: '1', name: 'User' } });
    (api.refreshInsights as any).mockResolvedValue({ insight: {} });
    renderWithRouter(<LoginPage />);
    
    const emailInput = screen.getByPlaceholderText(/demo@finexa.ai/i);
    const passInput = screen.getByPlaceholderText(/••••••••/i);
    const submitBtn = screen.getByRole('button', { name: /log in/i });

    await userEvent.type(emailInput, 'demo@smartspend.ai');
    await userEvent.type(passInput, 'demo1234');
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/home', { replace: true });
    });
  });
});
