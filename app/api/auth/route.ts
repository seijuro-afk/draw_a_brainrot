import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import dbConnect from '@/lib/db';
import User from '@/lib/models/User';

export async function POST(request: NextRequest) {
  try {
    await dbConnect();

    const body = await request.json();
    const { username, password, action } = body; // action: 'login' or 'signup'

    if (!username || !password) {
      return NextResponse.json({ error: 'Username and password required' }, { status: 400 });
    }

    if (action === 'signup') {
      // Check if user exists
      const existingUser = await User.findOne({ username });
      if (existingUser) {
        return NextResponse.json({ error: 'Username already exists' }, { status: 400 });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 12);

      // Create user
      const user = new User({
        username,
        password: hashedPassword,
      });
      await user.save();

      return NextResponse.json({ success: true, message: 'User created successfully' });
    } else if (action === 'login') {
      // Find user
      const user = await User.findOne({ username });
      if (!user) {
        return NextResponse.json({ error: 'Invalid username or password' }, { status: 401 });
      }

      // Check if user has password (for migration)
      if (!user.password) {
        return NextResponse.json({ error: 'Account requires password. Please sign up again.' }, { status: 400 });
      }

      // Check password
      const isValid = await bcrypt.compare(password, user.password);
      if (!isValid) {
        return NextResponse.json({ error: 'Invalid username or password' }, { status: 401 });
      }

      return NextResponse.json({ success: true, message: 'Login successful' });
    } else {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}