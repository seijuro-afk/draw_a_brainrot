import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import { verifyToken, getTokenFromRequest } from '@/lib/auth';
import { OwnedCardDocument } from '@/lib/types';
import { ObjectId } from 'mongodb';

// GET user's owned cards
export async function GET(request: NextRequest) {
  try {
    const token = getTokenFromRequest(request);

    if (!token) {
      return NextResponse.json(
        { error: 'Authorization token is required' },
        { status: 401 }
      );
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      );
    }

    const { db } = await connectToDatabase();
    const ownedCardsCollection = db.collection('ownedCards');

    const cards = await ownedCardsCollection
      .find({ userId: decoded.userId })
      .toArray();

    return NextResponse.json({ cards });
  } catch (error) {
    console.error('Get owned cards error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST: Add a card to user's collection
export async function POST(request: NextRequest) {
  try {
    const token = getTokenFromRequest(request);

    if (!token) {
      return NextResponse.json(
        { error: 'Authorization token is required' },
        { status: 401 }
      );
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      );
    }

    const { cardId, cardName, cardRarity, cardImage, stats, stars } = await request.json();

    if (!cardId || !cardName || !cardRarity || !cardImage || !stats) {
      return NextResponse.json(
        { error: 'Missing required card fields' },
        { status: 400 }
      );
    }

    const { db } = await connectToDatabase();
    const ownedCardsCollection = db.collection('ownedCards');

    const newCard: OwnedCardDocument = {
      userId: decoded.userId,
      cardId,
      cardName,
      cardRarity,
      cardImage,
      stats,
      stars: stars || 0,
      obtainedAt: Date.now(),
      favorited: false,
    };

    const result = await ownedCardsCollection.insertOne(newCard);

    return NextResponse.json(
      {
        message: 'Card added to collection',
        card: { ...newCard, _id: result.insertedId },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Add card error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
