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
  Window,
  ChannelList
} from 'stream-chat-react';
import Loader from '@/components/Loader'; // Ensure this path is correct
import { tokenProvider } from '@/actions/stream.actions';

const PersonalRoom = () => {
  const { user, isLoaded } = useUser();
  const [client, setClient] = useState(null);
  const [channel, setChannel] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

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
    <section className="flex h-screen">
      {/* Sidebar */}
      <div className="flex flex-col w-1/4 bg-gray-800 text-white">
        <div className="p-4 border-b border-gray-700">
          <h1 className="text-xl font-bold">Channels</h1>
        </div>
        <div className="flex-1 overflow-y-auto">
          <ChannelList 
            client={client}
            filters={{ members: { $in: [user.id] } }}
            sort={{ last_message_at: -1 }}
            options={{ subscribe: true }}
            Preview={(props) => (
              <div
                onClick={() => setChannel(props.channel)}
                className={`p-2 cursor-pointer hover:bg-gray-700 rounded ${
                  props.channel?.id === channel?.id ? 'bg-blue-600' : 'bg-gray-800'
                }`}
              >
                {props.channel?.data?.name || props.channel?.id}
              </div>
            )}
          />
        </div>
      </div>

      {/* Chat Window */}
      <div className="flex flex-col w-3/4 bg-gray-900 text-white">
        <Chat client={client} theme="team dark">
          <StreamChannelComponent channel={channel}>
            <Window>
              <ChannelHeader />
              <MessageList />
              <div className="p-4 bg-gray-800">
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
