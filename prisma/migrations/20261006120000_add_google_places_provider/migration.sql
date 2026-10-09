-- Allow users to store their own Google Maps (Places API) key
ALTER TYPE "ApiKeyProvider" ADD VALUE IF NOT EXISTS 'google_places';
