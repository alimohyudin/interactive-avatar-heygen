const nodemailer = require('nodemailer');

export async function POST(req: Request) {
    console.log("backend: Sending email...")
    if (req.method === "POST") {
        const { text } = await req.json();
        // console.log("text", text)
        // return Response.json({ success: true });

        try {
            // Create a transporter using your email service
            const transporter = nodemailer.createTransport({
                host: "mail.mcquare.com",
                port: 465,
                secure: true,
                auth: {
                    user: "heygen@mcquare.com", // Your email address
                    pass: "j-4k6k.f4WPz23B", // Your email password or app-specific password
                },
            });

            // Send the email
            const info = await transporter.sendMail({
                from: "heygen@mcquare.com",
                to: 'mrppuri@canadianlic.com',//mrppuri@canadianlic.com
                cc: 'mohyudin12@gmail.com',
                subject: 'Transcript of conversation',
                text: text,
            });

            return Response.json({ success: true, messageId: info.messageId });
        } catch (error : any) {
            console.error(error);
            return Response.json({ success: false, error: error.message });
        }
    } else {
        return Response.json({ success: false, error: "Invalid request method" });
    }
}
