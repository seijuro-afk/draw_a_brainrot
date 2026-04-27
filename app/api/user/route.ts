import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import User from '@/lib/models/User';

export async function GET(request: NextRequest) {
  try {
    await dbConnect();

    const { searchParams } = new URL(request.url);
    const username = searchParams.get('username');

    if (!username) {
      return NextResponse.json({ error: 'Username required' }, { status: 400 });
    }

    const user = await User.findOne({ username });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({
      collection: user.collection,
      items: user.items,
      shards: user.shards,
      regularPity: user.regularPity,
      shopStock: user.shopStock,
      restockAt: user.restockAt,
      userStats: { ...user.userStats, username: user.username },
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await dbConnect();

    const body = await request.json();
    const { username, collection, items, shards, regularPity, shopStock, restockAt, userStats } = body;

    if (!username) {
      return NextResponse.json({ error: 'Username required' }, { status: 400 });
    }

    const { username: _, ...statsWithoutUsername } = userStats || {};

    const user = await User.findOneAndUpdate(
      { username },
      {
        collection: collection || [],
        items: items || [],
        shards: shards || 0,
        regularPity: regularPity || 0,
        shopStock: shopStock || [],
        restockAt: restockAt || 0,
        userStats: statsWithoutUsername || {},
      },
      { upsert: true, new: true }
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}