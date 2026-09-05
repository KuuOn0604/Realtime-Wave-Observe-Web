import sys
import os
# Dòng này giúp Python tìm thấy các thư mục khác trong ai_service
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import pandas as pd
import ai_loader
from ai_loader import load_wave_data

def apply_rolling_mean(df, window_size=50):
    df['value_smooth'] = df['ch1_value(V)'].rolling(window=window_size, min_periods=1).mean()
    return df

