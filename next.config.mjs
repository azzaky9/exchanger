/** @type {import('next').NextConfig} */
const nextConfig = {
    async redirects() {
        return [
            {
                source: '/',
                destination: '/dashboard',
                permanent: true, // Use false (307) for temporary or true (308) for permanent
            },
        ]
    },
}

export default nextConfig
