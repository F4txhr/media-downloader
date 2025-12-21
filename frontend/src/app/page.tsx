"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Download, Loader2, Youtube } from "lucide-react";
import Image from "next/image";
import ytdl from "ytdl-core";

export default function Home() {
  const [url, setUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [mediaInfo, setMediaInfo] = useState<{
    thumbnail: string;
    title: string;
    duration: string;
    formats: ytdl.videoFormat[];
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMediaInfo(null);
    setError(null);

    try {
      const info = await ytdl.getInfo(url);
      setMediaInfo({
        thumbnail: info.videoDetails.thumbnails[0].url,
        title: info.videoDetails.title,
        duration: new Date(parseInt(info.videoDetails.lengthSeconds) * 1000)
          .toISOString()
          .substr(11, 8),
        formats: info.formats,
      });
    } catch (err) {
      console.error("Fetch error:", err);
      setError(
        err instanceof Error ? err.message : "An unknown error occurred."
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = () => {
    if (mediaInfo) {
      const videoFormat = ytdl.chooseFormat(mediaInfo.formats, {
        quality: "highestvideo",
      });
      const audioFormat = ytdl.chooseFormat(mediaInfo.formats, {
        quality: "highestaudio",
      });

      // This is a simplified download logic. A more robust solution would
      // use a library like mux.js to merge video and audio streams.
      window.open(videoFormat.url, "_blank");
      window.open(audioFormat.url, "_blank");
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        <div className="flex flex-col items-center justify-center space-y-4 text-center">
          <Youtube className="h-16 w-16" />
          <h1 className="text-3xl font-bold">Media Downloader</h1>
          <p className="text-muted-foreground">
            Enter a URL to download a video or audio.
          </p>
        </div>

        <form onSubmit={handleAnalyze} className="mt-8 space-y-4">
          <div className="grid w-full items-center gap-1.5">
            <Label htmlFor="url">Media URL</Label>
            <Input
              id="url"
              type="url"
              placeholder="https://www.youtube.com/watch?v=..."
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              required
              className="w-full"
            />
          </div>
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : null}
            Analyze
          </Button>
        </form>

        {error && (
          <div className="mt-4 text-center text-red-500">{error}</div>
        )}

        {mediaInfo && (
          <Card className="mt-8">
            <CardHeader>
              <CardTitle>Media Preview</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4">
              <div className="flex items-center space-x-4">
                <Image
                  src={mediaInfo.thumbnail}
                  alt="Media thumbnail"
                  width={120}
                  height={90}
                  className="rounded-lg"
                />
                <div className="space-y-1">
                  <h3 className="font-semibold">{mediaInfo.title}</h3>
                  <p className="text-sm text-muted-foreground">
                    Duration: {mediaInfo.duration}
                  </p>
                </div>
              </div>
              <Separator />
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="video-quality">Video Quality</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select quality" />
                    </SelectTrigger>
                    <SelectContent>
                      {ytdl
                        .filterFormats(mediaInfo.formats, "videoonly")
                        .map((format) => (
                          <SelectItem
                            key={format.itag}
                            value={format.itag.toString()}
                          >
                            {format.qualityLabel}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="audio-quality">Audio Quality</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select quality" />
                    </SelectTrigger>
                    <SelectContent>
                      {ytdl
                        .filterFormats(mediaInfo.formats, "audioonly")
                        .map((format) => (
                          <SelectItem
                            key={format.itag}
                            value={format.itag.toString()}
                          >
                            {format.audioBitrate}kbps
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button className="w-full" onClick={handleDownload}>
                <Download className="mr-2 h-4 w-4" />
                Download
              </Button>
            </CardFooter>
          </Card>
        )}

        <p className="mt-8 text-center text-xs text-muted-foreground">
          Legal Disclaimer: This tool is for personal use only. Do not use this
          tool to download copyrighted material without permission.
        </p>
      </div>
    </main>
  );
}
