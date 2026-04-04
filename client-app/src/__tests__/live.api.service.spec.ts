import { describe, it, expect, vi, beforeEach } from 'vitest';
import { liveApiService } from '../global/live.api.service';
import type { BrowserMessage } from '../global/live.api.service';

describe('liveApiService', () => {
  describe('connect', () => {
    it('opens a WebSocket with the correct URL (ws, localhost:8080 in dev)', () => {
      const wsSpy = vi.fn();
      vi.stubGlobal('WebSocket', wsSpy);

      liveApiService.connect('gemini-2.0-flash-live-001', 'Aoede');

      expect(wsSpy).toHaveBeenCalledWith(
        expect.stringContaining('/live/ws?model=gemini-2.0-flash-live-001&voice=Aoede')
      );
      vi.unstubAllGlobals();
    });

    it('encodes special characters in voice name', () => {
      const wsSpy = vi.fn();
      vi.stubGlobal('WebSocket', wsSpy);

      liveApiService.connect('model', 'Voice Name+Test');

      const url: string = wsSpy.mock.calls[0][0];
      expect(url).toContain('voice=Voice%20Name%2BTest');
      vi.unstubAllGlobals();
    });
  });

  describe('send', () => {
    function makeMockWS(readyState = WebSocket.OPEN) {
      return { readyState, send: vi.fn() } as unknown as WebSocket;
    }

    it('sends a JSON-stringified ready message when WS is open', () => {
      const ws = makeMockWS();
      const msg: BrowserMessage = { type: 'ready' };
      liveApiService.send(ws, msg);
      expect(ws.send).toHaveBeenCalledWith(JSON.stringify(msg));
    });

    it('sends an audio message with base64 data', () => {
      const ws = makeMockWS();
      const msg: BrowserMessage = { type: 'audio', data: 'AAEC' };
      liveApiService.send(ws, msg);
      expect(ws.send).toHaveBeenCalledWith('{"type":"audio","data":"AAEC"}');
    });

    it('sends an end message', () => {
      const ws = makeMockWS();
      const msg: BrowserMessage = { type: 'end' };
      liveApiService.send(ws, msg);
      expect(ws.send).toHaveBeenCalledWith('{"type":"end"}');
    });

    it('does not send when WS is not open', () => {
      const ws = makeMockWS(WebSocket.CLOSED);
      liveApiService.send(ws, { type: 'ready' });
      expect(ws.send).not.toHaveBeenCalled();
    });

    it('does not send when WS is connecting', () => {
      const ws = makeMockWS(WebSocket.CONNECTING);
      liveApiService.send(ws, { type: 'end' });
      expect(ws.send).not.toHaveBeenCalled();
    });
  });
});
