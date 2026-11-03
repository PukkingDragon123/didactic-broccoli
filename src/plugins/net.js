// Multiplayer (src/net/): world hosting over WebRTC (PeerJS), a five-letter room code, up to 4 players in the host's
// world, shared piggy bank, chat, emotes, slaps, pickpockets, 110 on a friend, cardboard beds. game.mp; dormant (no
// network, no cost) until the menu's HOST SHOP opens a room or a guest's tab comes back up inside one.
import { installMultiplayer } from '../net/Net.js';

export function install(game) {
  installMultiplayer(game);
}
