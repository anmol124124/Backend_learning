# -------------------------------
# 1️⃣ Base image (Node.js)
# -------------------------------
FROM node:22-alpine
ENV TZ=Asia/Kolkata

# -------------------------------
# 2️⃣ Working directory inside container
# -------------------------------
WORKDIR /app

# -------------------------------
# 3️⃣ Copy package files first
# (better caching)
# -------------------------------
COPY package*.json ./

# -------------------------------
# 4️⃣ Install dependencies
# -------------------------------
RUN npm install

# -------------------------------
# 5️⃣ Copy rest of the code
# -------------------------------
COPY . .

# -------------------------------
# 6️⃣ Expose backend port
# -------------------------------
EXPOSE 3000

# -------------------------------
# 7️⃣ Start the app
# -------------------------------
CMD ["node", "app.js"]
