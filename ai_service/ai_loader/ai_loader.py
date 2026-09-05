import pandas as pd

def load_wave_data(file_path):

    #Bỏ qua 10 dòng đầu tiên
    df = pd.read_csv(file_path, skiprows=9)

    #Hàm cột mốc thời gian để đưa ch1_time(s) về bắt đầu từ 0 thay vì số âm
    gia_tri_bat_dau = df['ch1_time(s)'].iloc[0]

    df['ch1_time(s)'] = df['ch1_time(s)'] - gia_tri_bat_dau

    return df