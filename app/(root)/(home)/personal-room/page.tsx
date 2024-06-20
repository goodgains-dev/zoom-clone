'use client';

import React, { useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import { StreamChat } from 'stream-chat';
import {
  Chat,
  Channel as StreamChannelComponent,
  ChannelHeader,
  MessageList,
  MessageInput,
  Thread,
  Window
} from 'stream-chat-react';
import { useRouter } from 'next/navigation';
import Loader from '@/components/Loader'; // Ensure this path is correct
import { tokenProvider } from '@/actions/stream.actions';
import { Button } from '@/components/ui/button'; // Ensure this path is correct
import { useToast } from '@/components/ui/use-toast'; // Ensure this path is correct

const PersonalRoom = () => {
  const router = useRouter();
  const { user, isLoaded } = useUser();
  const [client, setClient] = useState(null);
  const [channel, setChannel] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const { toast } = useToast();

  useEffect(() => {
    if (!user || !isLoaded) return;

    const initChat = async () => {
      try {
        const streamClient = StreamChat.getInstance(process.env.NEXT_PUBLIC_STREAM_API_KEY);
        const token = await tokenProvider(user.id);
        
        await streamClient.connectUser(
          {
            id: user.id,
            name: user.username || user.id,
            image: user.imageUrl,
          },
          token
        );

        const filters = { members: { $in: [user.id] } };
        const sort = [{ last_message_at: -1 }];
        const channels = await streamClient.queryChannels(filters, sort);
        console.log('Fetched channels:', channels);

        if (channels.length > 0) {
          setChannel(channels[0]);
        } else {
          // Create a default channel if none are found
          const defaultChannel = streamClient.channel('messaging', `default-${user.id}`, {
            name: `${user.username}'s Default Channel`,
            members: [user.id],
          });
          await defaultChannel.create();
          setChannel(defaultChannel);
        }

        setClient(streamClient);
      } catch (err) {
        console.error('Error initializing chat:', err);
        setError('Failed to initialize chat');
      } finally {
        setIsLoading(false);
      }
    };

    initChat();

    return () => {
      if (client) {
        client.disconnectUser();
      }
    };
  }, [user, isLoaded]);

  if (isLoading) return <Loader />;
  if (error) return <p>{error}</p>;
  if (!channel) return <p>Channel Not Found. Creating a default channel...</p>;

  return (
    <section className="flex flex-col items-center justify-center min-h-screen bg-gray-900 text-white">
      <h1 className="text-3xl font-bold mb-6">Chat Room</h1>
      <div className="flex flex-col w-full max-w-5xl gap-8 p-4 bg-gray-800 rounded-lg">
        <Chat client={client} theme="team dark">
          <StreamChannelComponent channel={channel}>
            <Window>
              <ChannelHeader />
              <MessageList />
              <div className="mt-4">
                <MessageInput />
              </div>
              <Thread />
            </Window>
          </StreamChannelComponent>
        </Chat>
      </div>
    </section>
  );
};

export default PersonalRoom;
export default PersonalRoom;
