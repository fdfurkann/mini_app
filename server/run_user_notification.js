export function formatPrice(value, precision) {
    if (value === null || typeof value === 'undefined' || isNaN(parseFloat(value))) return parseFloat(value);
    const factor = Math.pow(10, precision);
    const rounded = Math.floor(value * factor) / factor;
    return rounded.toFixed(precision);
}

export function createOpenPositionNotification({ symbol, direction, api_name, exchange, open_price, volume, leverage, digits, vdigits }) {
    const detailsHeader = `📡 **API Name:** ${api_name}\n🏦 **Exchange:** ${exchange}`;
    return `✅ ***${symbol} ${direction} POSITION OPENED***\n\n` +
        `📊 **Order Details:**\n` +
        `${detailsHeader}\n` +
        `💰 **Entry Price:** ${formatPrice(open_price, digits)}\n` +
        `📦 **Volume:** ${formatPrice(volume, vdigits)}\n` +
        `⚙️ **Leverage:** ${leverage}x\n` +
        `⏰ **Open Time:** ${new Date().toLocaleString('en-GB', { hour12: false })}\n\n` +
        `✨ *Good luck! Your position is being tracked.*`;
}

export function notifyTp(userSignalDetails, signalDetails, tpLevel, profit, profitPercent, closedVolume, apiKeyDetails, exchangeName, stepSize, vdigits) {
    profit = Number(profit) || 0;
    profitPercent = Number(profitPercent) || 0;
    let closedAmount = closedVolume;
    if (typeof stepSize !== 'undefined' && typeof vdigits !== 'undefined') {
        closedAmount = formatPrice(Math.floor(closedVolume / stepSize) * stepSize, vdigits);
    }
    const profitSign = profit >= 0 ? '+' : '';
    return `🎯 **${signalDetails.symbol} ${userSignalDetails.trend} TP${tpLevel} HIT**\n\n` +
        `📊 **Trade Details:**\n` +
        `📡 **API Name:** ${apiKeyDetails.api_name}\n` +
        `🏦 **Exchange:** ${exchangeName}\n` +
        `💰 Entry Price: ${formatPrice(userSignalDetails.open, 7)}\n` +
        `🎯 TP${tpLevel} Price: ${formatPrice(signalDetails[`tp${tpLevel}`], 7)}\n` +
        `📊 Closed Amount: ${closedAmount}\n` +
        `💚 Profit: ${profitSign}${profit.toFixed(2)} USDT (${profitSign}${profitPercent.toFixed(2)}%)\n` +
        `⏰ Close Time: ${new Date().toLocaleString('en-GB', { hour12: false })}\n\n` +
        `🎉 Congratulations! Your target has been reached.`;
}

export function notifyTp_en(userSignalDetails, signalDetails, tpLevel, profit, profitPercent, closedVolume, apiKeyDetails, exchangeName, stepSize, vdigits) {
    profit = Number(profit) || 0;
    profitPercent = Number(profitPercent) || 0;
    let closedAmount = closedVolume;
    if (typeof stepSize !== 'undefined' && typeof vdigits !== 'undefined') {
        closedAmount = formatPrice(Math.floor(closedVolume / stepSize) * stepSize, vdigits);
    }
    const profitSign = profit >= 0 ? '+' : '';
    return `🎯 **${signalDetails.symbol} ${userSignalDetails.trend} TP${tpLevel} HIT**\n\n` +
        `📊 **Trade Details:**\n` +
        `📡 **API Name:** ${apiKeyDetails.api_name}\n` +
        `🏦 **Exchange:** ${exchangeName}\n` +
        `💰 Entry Price: ${formatPrice(userSignalDetails.open, 7)}\n` +
        `🎯 TP${tpLevel} Price: ${formatPrice(signalDetails[`tp${tpLevel}`], 7)}\n` +
        `📊 Closed Amount: ${closedAmount}\n` +
        `💚 Profit: ${profitSign}${profit.toFixed(2)} USDT (${profitSign}${profitPercent.toFixed(2)}%)\n` +
        `⏰ Close Time: ${new Date().toLocaleString('en-GB', { hour12: false })}\n\n` +
        `🎉 Congratulations! Your target has been reached.`;
}

export function notifySl(userSignalDetails, signalDetails, profit, profitPercent, volume, close, apiKeyDetails, exchangeName, stepSize, vdigits) {
    profit = Number(profit) || 0;
    profitPercent = Number(profitPercent) || 0;
    let closedAmount = volume;
    if (typeof stepSize !== 'undefined' && typeof vdigits !== 'undefined') {
        closedAmount = formatPrice(Math.floor(volume / stepSize) * stepSize, vdigits);
    }
    const profitSign = profit >= 0 ? '+' : '';
    return `❌ **${signalDetails.symbol} ${userSignalDetails.trend} STOP LOSS**\n\n` +
        `📊 **Trade Details:**\n` +
        `📡 **API Name:** ${apiKeyDetails.api_name}\n` +
        `🏦 **Exchange:** ${exchangeName}\n` +
        `💰 Entry Price: ${formatPrice(userSignalDetails.open, 7)}\n` +
        `❌ Exit Price: ${formatPrice(close, 7)}\n` +
        `📊 Closed Amount: ${closedAmount}\n` +
        `💔 Profit/Loss: ${profitSign}${profit.toFixed(2)} USDT (${profitSign}${profitPercent.toFixed(2)}%)\n` +
        `⏰ Close Time: ${new Date().toLocaleString('en-GB', { hour12: false })}`;
}

export function notifyTrailStop(userSignalDetails, signalDetails, tpLevel, newSl, apiKeyDetails, exchangeName) {
    let tpLabel = '';
    let tpValue = '';
    if (tpLevel === 0) {
        tpLabel = 'Entry Price';
        tpValue = userSignalDetails.open || signalDetails.open || '-';
    } else {
        tpLabel = `TrailStop TP${tpLevel} Level`;
        tpValue = userSignalDetails[`tp${tpLevel}`] || signalDetails[`tp${tpLevel}`] || '-';
    }
    return `🔄 **${signalDetails.symbol} ${userSignalDetails.trend} TRAIL STOP**\n\n` +
        `📊 **Trade Details:**\n` +
        `📡 **API Name:** ${apiKeyDetails.api_name}\n` +
        `🏦 **Exchange:** ${exchangeName}\n` +
        `💰 Entry Price: ${userSignalDetails.open}\n` +
        `🔔 ${tpLabel}: ${tpValue}\n` +
        `🛡️ New Stop Loss: ${newSl}\n` +
        `⏰ Time: ${new Date().toLocaleString('en-GB', { hour12: false })}\n\n` +
        `🚦 Stop Loss updated automatically.`;
}

export function notifyTrailStopClosed(userSignalDetails, signalDetails, lastSl, profit, apiKeyDetails, exchangeName) {
    return `🔚 **${signalDetails.symbol} ${userSignalDetails.trend} TRAIL STOP POSITION CLOSED**\n\n` +
        `📊 **Trade Details:**\n` +
        `📡 **API Name:** ${apiKeyDetails.api_name}\n` +
        `🏦 **Exchange:** ${exchangeName}\n` +
        `💰 Open Price: ${userSignalDetails.open}\n` +
        `🛑 Last SL Price: ${lastSl}\n` +
        `📊 Closed Amount: ${userSignalDetails.volume}\n` +
        `💚 P/L: ${profit.toFixed(5)} USDT\n` +
        `⏰ Close Time: ${new Date().toLocaleString('en-GB', { hour12: false })}\n\n` +
        `🚦 Your position was closed automatically by Trail Stop.`;
}

export function notifyBreakEven(userSignalDetails, signalDetails, breakEvenTpIdx, newSl, apiKeyDetails, exchangeName) {
    let tpLabel = breakEvenTpIdx > 0 ? `BreakEven TP${breakEvenTpIdx} Level` : '-';
    let tpValue = '-';
    if (breakEvenTpIdx > 0) {
        tpValue = userSignalDetails[`tp${breakEvenTpIdx}`] || signalDetails[`tp${breakEvenTpIdx}`] || '-';
    }
    return `⚖️ **${signalDetails.symbol} ${userSignalDetails.trend} BREAK EVEN**\n\n` +
        `📊 **Trade Details:**\n` +
        `📡 **API Name:** ${apiKeyDetails.api_name}\n` +
        `🏦 **Exchange:** ${exchangeName}\n` +
        `💰 Entry Price: ${userSignalDetails.open}\n` +
        `🔔 ${tpLabel}: ${tpValue}\n` +
        `🛡️ New Stop Loss: ${newSl}\n` +
        `⏰ Time: ${new Date().toLocaleString('en-GB', { hour12: false })}\n\n` +
        `🚦 Stop Loss moved to break even automatically.`;
}

export function notifyOrderOpen(symbol, direction, apiName, exchangeName, open, volume, leverage, opentime) {
    return `✅ ***${symbol} ${direction} POSITION OPENED***\n\n` +
        `📊 **Order Details:**\n` +
        `📡 **API Name:** ${apiName}\n` +
        `🏦 **Exchange:** ${exchangeName}\n` +
        `💰 **Entry Price:** ${open}\n` +
        `📦 **Volume:** ${volume}\n` +
        `⚙️ **Leverage:** ${leverage}x\n` +
        `⏰ **Open Time:** ${opentime}\n\n` +
        `✨ *Good luck! Your position is being tracked.*`;
}

export function notifyOrderFailed(symbol, direction, apiName, exchangeName, errorMsg) {
    let parsedMsg = errorMsg;


    console.log("notifyOrderFailed - ",errorMsg);

    try {
        // Eğer object ise ve msg alanı varsa onu kullan
        if (typeof errorMsg === 'object' && errorMsg !== null && errorMsg.msg) {
            parsedMsg = errorMsg.msg;
        } else if (typeof errorMsg === 'string') {
            // JSON array ise ilk elemanın msg alanını al
            if (errorMsg.trim().startsWith('[')) {
                const arr = JSON.parse(errorMsg);
                if (Array.isArray(arr) && arr.length > 0 && arr[0].msg) {
                    parsedMsg = arr[0].msg;
                }
            // JSON obje ise msg alanını al
            } else if (errorMsg.trim().startsWith('{')) {
                const obj = JSON.parse(errorMsg);
                if (obj && obj.msg) {
                    parsedMsg = obj.msg;
                }
            }
        }
    } catch (_) {}
    return `⚠️ ***Order Failed*** ⚠️\n\n` +
        `**Signal:** ${symbol} ${direction}\n` +
        `**API Name:** ${apiName}\n` +
        `**Exchange:** ${exchangeName}\n\n` +
        `**Exchange Error:** ${parsedMsg || '-'}\n\n` +
        `Please check your exchange account and API settings. The position for this signal **COULD NOT BE OPENED**.`;
}

export function notifyOpenPositionExists(symbol, apiName, exchangeName) {
    return `🚫 ***${symbol} OPEN POSITION EXISTS***\n\n` +
        `📊 **Trade Details:**\n` +
        `📡 **API Name:** ${apiName}\n` +
        `🏦 **Exchange:** ${exchangeName}\n\n` +
        `A new trade could not be opened as you already have an open position in this pair.`;
}