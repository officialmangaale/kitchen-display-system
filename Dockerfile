# Stage 1: Build
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
# Vite embeds these values in the browser bundle. Fail the image build rather
# than shipping a bundle that would call the static KDS host for API requests.
ARG VITE_API_BASE_URL
ARG VITE_WS_BASE_URL
ARG VITE_USER_SERVICE_BASE_URL
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
ENV VITE_WS_BASE_URL=$VITE_WS_BASE_URL
ENV VITE_USER_SERVICE_BASE_URL=$VITE_USER_SERVICE_BASE_URL
RUN test -n "$VITE_API_BASE_URL" && test -n "$VITE_WS_BASE_URL" && test -n "$VITE_USER_SERVICE_BASE_URL"
RUN npm run build

# Stage 2: Serve
FROM nginx:alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
