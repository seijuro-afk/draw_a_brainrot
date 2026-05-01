import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import { verifyPassword, generateToken } from '@/lib/auth';

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

    const { db } = await connectToDatabase();
    const usersCollection = db.collection('users');

    // Find user by username
    const user = await usersCollection.findOne({ username });
    if (!user) {
      return NextResponse.json(
        { error: 'Invalid username or password' },
        { status: 401 }
      );
    }

    // Verify password
    const passwordMatch = await verifyPassword(password, user.password);
    if (!passwordMatch) {
      return NextResponse.json(
        { error: 'Invalid username or password' },
        { status: 401 }
      );
    }

    // Generate JWT token
    const token = generateToken(user._id.toString());

    return NextResponse.json({
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        username: user.username,
        shards: user.shards,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
