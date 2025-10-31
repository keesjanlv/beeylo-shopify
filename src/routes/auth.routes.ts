import { Router, Request, Response } from 'express';
import { OAuthService } from '../services/oauth.service';
import { config } from '../config';

const router = Router();
const oauthService = new OAuthService();

/**
 * GET /auth/shopify
 * Initiate Shopify OAuth flow
 */
router.get('/shopify', async (req: Request, res: Response) => {
  try {
    const { shop, company_id } = req.query;

    if (!shop || !company_id) {
      return res.status(400).json({
        error: 'Missing required parameters: shop and company_id',
      });
    }

    const authUrl = await oauthService.getAuthorizationUrl(
      shop as string,
      company_id as string
    );

    res.redirect(authUrl);
  } catch (error: any) {
    console.error('OAuth initiation error:', error);
    res.status(500).json({
      error: 'Failed to initiate OAuth flow',
      message: error.message,
    });
  }
});

/**
 * GET /auth/callback
 * Handle Shopify OAuth callback
 */
router.get('/callback', async (req: Request, res: Response) => {
  try {
    const { shop, code, state } = req.query;

    if (!shop || !code || !state) {
      return res.status(400).json({
        error: 'Missing required parameters: shop, code, or state',
      });
    }

    const store = await oauthService.handleCallback(
      shop as string,
      code as string,
      state as string
    );

    // Redirect back to the dashboard integrations page with success message
    const dashboardUrl = config.urls.dashboard;
    res.redirect(`${dashboardUrl}/settings/integrations?shopify_connected=true&shop=${shop}`);
  } catch (error: any) {
    console.error('OAuth callback error:', error);
    const dashboardUrl = config.urls.dashboard;
    res.redirect(`${dashboardUrl}/settings/integrations?shopify_error=${encodeURIComponent(error.message)}`);
  }
});

/**
 * POST /auth/disconnect
 * Disconnect a Shopify store
 */
router.post('/disconnect', async (req: Request, res: Response) => {
  try {
    const { store_id } = req.body;

    if (!store_id) {
      return res.status(400).json({
        error: 'Missing required parameter: store_id',
      });
    }

    const result = await oauthService.disconnectStore(store_id);

    res.json(result);
  } catch (error: any) {
    console.error('Disconnect error:', error);
    res.status(500).json({
      error: 'Failed to disconnect store',
      message: error.message,
    });
  }
});

export default router;
