/**
 * Test broadcast message (works with Free account)
 */

const TOKEN = '8A+i94iyiAZTTQHveMO86fMNEeLABzoAIJXEy1UIj348WymICWitNKZ8rKswG35FMg2EQynlW73+QhH8Jc//QRHI2v6K43SrNb96ERlUK2I8Otf6dbDUz6iLWXkDplA0HbULwlV8tvO1GDtpU05qzQdB04t89/1O/w1cDnyilFU=';

async function broadcastMessage() {
    console.log('📤 Sending broadcast message to all followers...');

    const response = await fetch('https://api.line.me/v2/bot/message/broadcast', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${TOKEN}`
        },
        body: JSON.stringify({
            messages: [{
                type: 'text',
                text: '🎉 ทดสอบ Saramondā Delivery!\n\nระบบแจ้งเตือน LINE พร้อมใช้งานแล้ว ✅'
            }]
        })
    });

    if (response.ok) {
        console.log('✅ Broadcast sent successfully!');
        console.log('📱 Check your LINE app - you should receive the message!');
    } else {
        const err = await response.text();
        console.log('❌ Broadcast failed:', response.status, err);
    }
}

broadcastMessage().catch(console.error);
