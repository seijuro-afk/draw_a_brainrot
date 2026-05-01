import mongoose from 'mongoose';
import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import User from '@/lib/models/User';

function mapOwnedCard(doc: any) {
  return {
    id: doc.cardId ?? doc._id?.toString() ?? '',
    name: doc.cardName ?? doc.name ?? '',
    rarity: doc.cardRarity ?? doc.rarity ?? '',
    image: doc.cardImage ?? doc.image ?? '',
    stats: doc.stats ?? { brainrotPower: 0, rizz: 0, sigmaAura: 0, npcEnergy: 0 },
    stars: doc.stars ?? 0,
    obtainedAt: doc.obtainedAt ?? 0,
    favorited: doc.favorited ?? false,
  };
}

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

    const db = mongoose.connection.db;
    if (!db) {
      throw new Error('Database connection is not available');
    }

    const ownedCards = await db
      .collection('ownedCards')
      .find({ userId: user._id.toString() })
      .toArray();

    return NextResponse.json({
      collection: ownedCards.map(mapOwnedCard),
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

    const userId = user._id.toString();
    const db = mongoose.connection.db;
    if (!db) {
      throw new Error('Database connection is not available');
    }
    const ownedCardsCollection = db.collection('ownedCards');

    await ownedCardsCollection.deleteMany({ userId });

    if (Array.isArray(collection) && collection.length > 0) {
      const docs = collection.map((card: any) => ({
        userId,
        cardId: card.id,
        cardName: card.name,
        cardRarity: card.rarity,
        cardImage: card.image,
        stats: card.stats,
        stars: card.stars ?? 0,
        obtainedAt: card.obtainedAt ?? Date.now(),
        favorited: card.favorited ?? false,
      }));
      await ownedCardsCollection.insertMany(docs);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}