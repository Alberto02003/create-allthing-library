var builder = WebApplication.CreateBuilder(args);

// Configure Kestrel to listen on port 8080 (Docker-friendly, non-privileged)
builder.WebHost.UseUrls("http://0.0.0.0:8080");

var app = builder.Build();

app.MapGet("/health", () => Results.Ok(new { status = "ok" }));

app.MapGet("/", () => Results.Ok(new { message = "Backend API running" }));

app.Run();
