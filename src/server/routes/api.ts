import { Hono } from 'hono';
import { context, redis, reddit } from '@devvit/web/server';
import type {
  DecrementResponse,
  IncrementResponse,
  InitResponse,
  ModerationSummaryRequest,
  ModerationSummaryResponse,
} from '../../shared/api';
import { generateModerationSummary } from '../core/openrouter';

type ErrorResponse = {
  status: 'error';
  message: string;
};

export const api = new Hono();

api.get('/init', async (c) => {
  const { postId } = context;

  if (!postId) {
    console.error('API Init Error: postId not found in devvit context');
    return c.json<ErrorResponse>(
      {
        status: 'error',
        message: 'postId is required but missing from context',
      },
      400
    );
  }

  try {
    const [count, username] = await Promise.all([
      redis.get('count'),
      reddit.getCurrentUsername(),
    ]);

    return c.json<InitResponse>({
      type: 'init',
      postId: postId,
      count: count ? parseInt(count) : 0,
      username: username ?? 'anonymous',
    });
  } catch (error) {
    console.error(`API Init Error for post ${postId}:`, error);
    let errorMessage = 'Unknown error during initialization';
    if (error instanceof Error) {
      errorMessage = `Initialization failed: ${error.message}`;
    }
    return c.json<ErrorResponse>(
      { status: 'error', message: errorMessage },
      400
    );
  }
});

api.post('/increment', async (c) => {
  const { postId } = context;
  if (!postId) {
    return c.json<ErrorResponse>(
      {
        status: 'error',
        message: 'postId is required',
      },
      400
    );
  }

  const count = await redis.incrBy('count', 1);
  return c.json<IncrementResponse>({
    count,
    postId,
    type: 'increment',
  });
});

api.post('/decrement', async (c) => {
  const { postId } = context;
  if (!postId) {
    return c.json<ErrorResponse>(
      {
        status: 'error',
        message: 'postId is required',
      },
      400
    );
  }

  const count = await redis.incrBy('count', -1);
  return c.json<DecrementResponse>({
    count,
    postId,
    type: 'decrement',
  });
});

api.post('/moderation-summary', async (c) => {
  try {
    const body = (await c.req.json()) as Partial<ModerationSummaryRequest>;
    const comments =
      body.comments?.filter(
        (comment): comment is string =>
          typeof comment === 'string' && comment.trim().length > 0
      ) ?? [];

    if (comments.length === 0) {
      return c.json<ErrorResponse>(
        {
          status: 'error',
          message: 'At least one reported comment is required.',
        },
        400
      );
    }

    const summary = await generateModerationSummary({ comments });
    return c.json<ModerationSummaryResponse>(summary);
  } catch (error) {
    console.error('Moderation summary generation failed:', error);
    const message =
      error instanceof Error ? error.message : 'Unknown moderation summary error';

    return c.json<ErrorResponse>(
      {
        status: 'error',
        message,
      },
      500
    );
  }
});
