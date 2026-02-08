export type WeatherNow = {
    tempC: number;
    feelsLikeC: number;
    condition: string;
    rainMm: number;
    windKmh: number;
  };
  
  export async function getWeatherNow(lat: number, lon: number): Promise<WeatherNow> {
    const url = new URL("https://api.open-meteo.com/v1/forecast");
    url.searchParams.set("latitude", String(lat));
    url.searchParams.set("longitude", String(lon));
    url.searchParams.set(
      "current",
      [
        "temperature_2m",
        "apparent_temperature",
        "precipitation",
        "rain",
        "showers",
        "weather_code",
        "wind_speed_10m",
      ].join(",")
    );
    url.searchParams.set("timezone", "Asia/Ho_Chi_Minh");
    url.searchParams.set("wind_speed_unit", "kmh");
  
    const res = await fetch(url.toString(), { cache: "no-store" });
    if (!res.ok) throw new Error("Weather API failed");
    const data = await res.json();
  
    const c = data.current;
    const rainMm = Number(c.precipitation ?? 0);
  
    // map đơn giản để model dễ hiểu
    let condition = "cloudy";
    if (rainMm > 0 || Number(c.rain ?? 0) > 0 || Number(c.showers ?? 0) > 0) condition = "rainy";
    else if (Number(c.weather_code) === 0) condition = "clear";
  
    return {
      tempC: Number(c.temperature_2m),
      feelsLikeC: Number(c.apparent_temperature),
      condition,
      rainMm,
      windKmh: Number(c.wind_speed_10m ?? 0),
    };
  }
  