import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import { hashPassword, generateToken } from '@/lib/auth';
import { User } from '@/lib/types';
import { ObjectId } from 'mongodb';

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json();

    // Validation
    if (!username || !password) {
      return NextResponse.json(
        { error: 'Username and password are required' },
        { status: 400 }
      );
    }

    if (username.length < 3) {
      return NextResponse.json(
        { error: 'Username must be at least 3 characters' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters' },
        { status: 400 }
      );
    }

    const { db } = await connectToDatabase();
    const usersCollection = db.collection('users');

    // Check if user already exists
    const existingUser = await usersCollection.findOne({ username });
    if (existingUser) {
      return NextResponse.json(
        { error: 'Username already taken' },
        { status: 409 }
      );
    }

    // Hash password
    const hashedPassword = await hashPassword(password);
    const now = Date.now();

    // Create new user
    const newUser: User = {
      username,
      password: hashedPassword,
      shards: 0,
      regularPity: 0,
      shopStock: [],
      restockAt: now,
      userStats: {
        totalPulls: 0,
        regularPulls: 0,
        deluxePulls: 0,
        wKeyPulls: 0,
        wins: 0,
        losses: 0,
        totalShardsEarned: 0,
        totalShardsSpent: 0,
        itemsCrafted: 0,
        itemsBought: 0,
        cardsDeleted: 0,
        cardsUpgraded: 0,
        favoritedCount: 0,
        joinedAt: now,
      },
      createdAt: now,
      updatedAt: now,
    };

    const result = await usersCollection.insertOne(newUser);

    // Generate JWT token
    const token = generateToken(result.insertedId.toString());

    return NextResponse.json(
      {
        message: 'User created successfully',
        token,
        user: {
          id: result.insertedId,
          username: newUser.username,
          shards: newUser.shards,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
