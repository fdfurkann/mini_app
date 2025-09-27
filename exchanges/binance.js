async set_margin_type(symbol, marginType, params = {}) {
    if (!symbol || !marginType) {
        console.warn(`[Rbinance] set_margin_type çağrısı için sembol veya marjin tipi eksik.`);
        return;
    }

    let correctedMarginType = marginType.toUpperCase();
    if (correctedMarginType === 'CROSS') {
        correctedMarginType = 'CROSSED';
    }

    if (correctedMarginType !== 'ISOLATED' && correctedMarginType !== 'CROSSED') {
        const errorMessage = `Invalid marginType: ${marginType}. Must be one of ISOLATED, CROSSED`;
        console.warn(`[Rbinance] Binance marjin tipi ayarlama uyarısı: ${errorMessage}`);
        throw new Error(errorMessage);
    }

    try {
        await this.fapiPrivatePostMarginType({
            symbol: this.market(symbol)['id'],
            marginType: correctedMarginType,
            ...params,
        });
        console.log(`[Rbinance] ${symbol} için marjin tipi başarıyla ${correctedMarginType} olarak ayarlandı.`);
    } catch (e) {
        if (e.message.includes('-4046')) { // No need to change margin type
            console.warn(`[Rbinance] Binance marjin tipi ayarlama uyarısı: ${e.message}`);
            console.log(`[Rbinance] Binance marjin tipi zaten ${correctedMarginType} veya değiştirilemiyor.`);
        } else {
            throw e;
        }
    }
}

async set_leverage(symbol, leverage, params = {}) {
    if (!symbol || !leverage) {
        console.warn(`[Rbinance] set_leverage çağrısı için sembol veya marjin tipi eksik.`);
        return;
    }

    let correctedLeverage = leverage.toUpperCase();
    if (correctedLeverage === 'CROSS') {
        correctedLeverage = 'CROSSED';
    }

    if (correctedLeverage !== 'ISOLATED' && correctedLeverage !== 'CROSSED') {
        const errorMessage = `Invalid leverage: ${leverage}. Must be one of ISOLATED, CROSSED`;
        console.warn(`[Rbinance] Binance marjin tipi ayarlama uyarısı: ${errorMessage}`);
        throw new Error(errorMessage);
    }

    try {
        await this.fapiPrivatePostLeverage({
            symbol: this.market(symbol)['id'],
            leverage: correctedLeverage,
            ...params,
        });
        console.log(`[Rbinance] ${symbol} için marjin tipi başarıyla ${correctedLeverage} olarak ayarlandı.`);
    } catch (e) {
        if (e.message.includes('-4046')) { // No need to change margin type
            console.warn(`[Rbinance] Binance marjin tipi ayarlama uyarısı: ${e.message}`);
            console.log(`[Rbinance] Binance marjin tipi zaten ${correctedLeverage} veya değiştirilemiyor.`);
        } else {
            throw e;
        }
    }
}

priceToPrecision(symbol, price) {
    const market = this.markets[symbol];
    if (market && market.precision && market.precision.price) {
        return this.decimalToPrecision(price, this.ROUND, market.precision.price, this.precisionMode);
    }
    return price.toString();
}

amountToPrecision(symbol, amount) {
    const market = this.markets[symbol];
    if (market && market.precision && market.precision.amount) {
        return this.decimalToPrecision(amount, this.ROUND, market.precision.amount, this.precisionMode);
    }
    return amount.toString();
} 