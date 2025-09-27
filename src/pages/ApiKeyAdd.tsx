

export default function ApiKeyAdd() {
  const [formData, setFormData] = useState({
    api_type: 1,
    api_name: '',
    api_key: '',
    api_secret: '',
    bot_room: '',
    lotsize: '6',
    leverage: 20,
    margin_type: 'ISOLATED',
    max_orders: 10,
    auto_trade: 1,
    stop_loss: 0,
    stop_loss_settings: 'signal',
    percent_loss: null,
    stop_amount: null,
    take_profit: null,
    take_profit_trading_setting: null,
    signal_profit: null,
    percent_profit: null,
    tp0: null,
    tp1: '20',
    tp2: '20',
    tp3: '20',
    tp4: '20',
    tp5: '20',
    tp6: '20',
    tp7: '20',
    tp8: '20',
    tp9: '20',
    tp10: '20',
    is_profit_target_enabled: null,
    profit_amount: null,
    profit_target_amount: null,
    withdraw_to_cost: null,
    trail_stop: 0,
    sl_tp_order: 0,
    break_even_level: 'none',
    status: 1
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSecret, setShowSecret] = useState(false);

  // ... existing code ...
} 